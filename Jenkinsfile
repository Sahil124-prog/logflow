// pipeline {
//     agent any

//     environment {
//         IMAGE_NAME = 'logflow-api'
//         REGISTRY = 'docker.io/sahilrajput062004'
//     }

//     stages {

//         stage('Checkout') {
//             steps {
//                 checkout scm
//             }
//         }

//         stage('Install') {
//             steps {
//                 bat 'npm ci'
//             }
//         }

//         stage('Test') {
//             steps {
//                 bat 'npm test'
//             }
//         }

//         stage('Docker Build & Push') {
//             steps {
//                 withCredentials([usernamePassword(
//                     credentialsId: 'docker-hub-credentials',
//                     usernameVariable: 'DOCKER_USER',
//                     passwordVariable: 'DOCKER_PASS'
//                 )]) {
//                     bat """
//                         docker build -t %REGISTRY%/%IMAGE_NAME%:%BUILD_NUMBER% .
//                         docker login -u %DOCKER_USER% -p %DOCKER_PASS%
//                         docker push %REGISTRY%/%IMAGE_NAME%:%BUILD_NUMBER%
//                     """
//                 }
//             }
//         }

//         stage('Deploy') {
//             steps {
//                 bat """
//                      kubectl --kubeconfig="C:\\ProgramData\\Jenkins\\.jenkins\\config" set image deployment/logflow-api logflow-api=%REGISTRY%/%IMAGE_NAME%:%BUILD_NUMBER%
//                 """
//             }
//         }
//     }

//     post {
//         success {
//             echo 'LogFlow deployed successfully!'
            
//             powershell """
//             Invoke-RestMethod -Uri "http://localhost:8081/api/deploys" -Method Post -Headers @{"Content-Type"="application/json"} -Body '{"buildNumber": ${env.BUILD_NUMBER}, "imageTag": "${env.IMAGE_NAME}:${env.BUILD_NUMBER}", "status": "success"}'
//             """
//         }
//         failure {
//             echo 'Pipeline failed — LogFlow NOT deployed.'
            
//             powershell """
//             Invoke-RestMethod -Uri "http://localhost:8081/api/deploys" -Method Post -Headers @{"Content-Type"="application/json"} -Body '{"buildNumber": ${env.BUILD_NUMBER}, "imageTag": "${env.IMAGE_NAME}:${env.BUILD_NUMBER}", "status": "failed"}'
//             """
//         }
//         always {
//             bat 'docker logout'
//         }
//     }
// }





pipeline {
    agent any

    // CHANGE 1: checkbox to push to ECR (off by default)
    parameters {
        booleanParam(name: 'PUSH_TO_ECR', defaultValue: false,
                     description: 'Tick to push images to AWS ECR (needs an active AWS key)')
    }

    environment {
        AWS_ACCOUNT_ID = '866972254535'
        AWS_REGION     = 'us-east-1'
        ECR_REGISTRY   = '866972254535.dkr.ecr.us-east-1.amazonaws.com'
    }

    stages {

        stage('Checkout') {
            steps { checkout scm }
        }

        stage('Install') {
            steps { bat 'npm ci' }
        }

                stage('Test') {
            environment {
                // Port 27019, not 27018, so it never clashes with your local test Mongo
                MONGO_TEST_URI = 'mongodb://127.0.0.1:27019/logflow-test'
            }
            steps {
                bat 'docker run -d --rm --name logflow-ci-mongo-%BUILD_NUMBER% -p 27019:27017 mongo:6'
                // Wait up to 30 s until Mongo answers a ping
                powershell '''
                    for ($i = 0; $i -lt 30; $i++) {
                        docker exec "logflow-ci-mongo-$env:BUILD_NUMBER" mongosh --quiet --eval "db.runCommand({ping:1}).ok" 2>$null
                        if ($LASTEXITCODE -eq 0) { Write-Host "Mongo is up"; exit 0 }
                        Start-Sleep -Seconds 1
                    }
                    Write-Error "Mongo did not start in 30s"; exit 1
                '''
                bat 'npm test'
            }
            post {
                always {
                    // Runs even if the tests fail, so no leftover container
                    bat 'docker rm -f logflow-ci-mongo-%BUILD_NUMBER% || exit /b 0'
                }
            }
        }

        stage('ECR Login') {
            // CHANGE 2: only runs when PUSH_TO_ECR is ticked
            when { expression { params.PUSH_TO_ECR } }
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'aws-ecr-credentials',
                    usernameVariable: 'AWS_ACCESS_KEY_ID',
                    passwordVariable: 'AWS_SECRET_ACCESS_KEY'
                )]) {
                    bat '''
                        aws ecr get-login-password --region %AWS_REGION% | docker login --username AWS --password-stdin %ECR_REGISTRY%
                    '''
                }
            }
        }

        stage('Build & Push Images') {
            steps {
                script {
                    def services = [
                        [name: 'logflow-api',                   context: '.',                          dockerfile: 'Dockerfile'],
                        [name: 'logflow-log-ingestion-service', context: '.\\log-ingestion-service',   dockerfile: 'Dockerfile'],
                        [name: 'logflow-alert-service',         context: '.\\alert-service',           dockerfile: 'Dockerfile'],
                        [name: 'logflow-notification-service',  context: '.\\notification-service',    dockerfile: 'Dockerfile'],
                        [name: 'logflow-client',                context: '.\\client',                  dockerfile: 'Dockerfile'],
                        [name: 'logflow-simulator',              context: '.\\services',                dockerfile: 'Dockerfile'],
                    ]

                    for (svc in services) {
                    bat """
                        docker build -f ${svc.context}\\${svc.dockerfile} -t %ECR_REGISTRY%/${svc.name}:%BUILD_NUMBER% ${svc.context}
                    """
                    // CHANGE 3: push only when PUSH_TO_ECR is ticked
                    if (params.PUSH_TO_ECR) {
                        bat """
                            docker push %ECR_REGISTRY%/${svc.name}:%BUILD_NUMBER%
                        """
                    }
                    }
                }
            }
        }

        stage('Deploy') {
            steps {
                echo 'Deploy stage — pending Phase 3 (EKS cluster). Will call aws eks update-kubeconfig + kubectl set image once the cluster exists.'
            }
        }
    }

    post {
        success {
        echo 'LogFlow build & push succeeded!'
        withCredentials([string(credentialsId: 'logflow-deploy-key', variable: 'DEPLOY_KEY')]) {
            powershell """
            try {
                Invoke-RestMethod -Uri "http://localhost:8081/api/deploys" -Method Post -Headers @{"Content-Type"="application/json"; "x-deploy-key"=\$env:DEPLOY_KEY} -Body '{"buildNumber": "${env.BUILD_NUMBER}", "status": "success"}'
            } catch {
                Write-Host "Deploy webhook unreachable — skipping (local stack likely not running)."
            }
            """
        }
    }
    failure {
        echo 'Pipeline failed — LogFlow build/push did NOT complete.'
        withCredentials([string(credentialsId: 'logflow-deploy-key', variable: 'DEPLOY_KEY')]) {
            powershell """
            try {
                Invoke-RestMethod -Uri "http://localhost:8081/api/deploys" -Method Post -Headers @{"Content-Type"="application/json"; "x-deploy-key"=\$env:DEPLOY_KEY} -Body '{"buildNumber": "${env.BUILD_NUMBER}", "status": "failed"}'
            } catch {
                Write-Host "Deploy webhook unreachable — skipping (local stack likely not running)."
            }
            """
        }
    }
    
    
    always {
        bat 'docker logout %ECR_REGISTRY%'
    }
    }
}